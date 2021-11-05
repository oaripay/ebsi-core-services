node {
    try {
        stage('Clone repo') {
            checkout scm
        }
        stage('Unit test') {
            withCredentials([string(credentialsId: 'API_STORAGE_PRIVATE_KEY', variable: 'API_PRIVATE_KEY')]) {
                nodejs(nodeJSInstallationName: '16.13.0') {
                    sh 'yarn install --frozen-lockfile'
                    sh 'yarn run audit'
                    sh 'yarn lint'
                    sh 'yarn test:ci'
                }
            }
        }
        ebsi_deploy("clone_repo": false)
    } catch (e) {
        throw e
    } finally {
        cleanWs()
        dir("${env.WORKSPACE}@script") {
            deleteDir()
        }
    }
}

