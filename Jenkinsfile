node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        nodejs(nodeJSInstallationName: '14.15.4') {
            sh 'yarn install --frozen-lockfile'
            sh 'yarn run audit'
            sh 'yarn lint'
            sh 'yarn test:ci'
        }
    }
    ebsi_deploy("clone_repo": false)
}