node {
    try {
      stage('Clone repo') {
          checkout([
            $class: 'GitSCM',
            branches: scm.branches,
            doGenerateSubmoduleConfigurations: false,
            extensions: [[
                $class: 'SubmoduleOption',
                disableSubmodules: false,
                parentCredentials: true,
                recursiveSubmodules: true,
                reference: '',
                trackingSubmodules: false
            ]],
            submoduleCfg: [],
            userRemoteConfigs: scm.userRemoteConfigs
        ])
      }
      stage('Unit test') {
          withCredentials([string(credentialsId: 'API_PRIVATE_KEY', variable: 'API_PRIVATE_KEY')]) {
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
